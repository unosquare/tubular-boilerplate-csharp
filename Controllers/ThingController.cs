using System.Linq;
using System.Web.Http;
using TubularBaseProject.Models;
using Unosquare.Tubular;
using Unosquare.Tubular.ObjectModel;

namespace TubularBaseProject.Controllers
{
    [Authorize, RoutePrefix("api/thing")]
    public class ThingController : ApiController
    {
        private readonly ThingRepository _repository = new ThingRepository();

        [HttpPost, Route("paged")]
        public IHttpActionResult GetGridData([FromBody] GridDataRequest request)
        {
            return Ok(request.CreateGridDataResponse(_repository.GetData()));
        }

        [HttpPost]
        public IHttpActionResult PostData([FromBody] Thing model)
        {
            _repository.AddItem(model);

            return Ok();
        }

        [HttpPut]
        public IHttpActionResult PutData([FromBody] GridDataUpdateRow<Thing> model)
        {
            var item = _repository.GetData().FirstOrDefault(x => x.Id == model.Old.Id);

            if (item == null)
                return NotFound();

            item.Name = model.New.Name;
            item.Amount = model.New.Amount;

            return Ok();
        }

        [HttpGet, Route("select/{id}")]
        public IHttpActionResult Get([FromUri] int id)
        {
            var item = _repository.GetData().FirstOrDefault(x => x.Id == id);

            if (item == null)
                return NotFound();
            
            return Ok(item);
        }

        [HttpDelete, Route("{id}")]
        public IHttpActionResult Delete([FromUri] int id)
        {
            var item = _repository.GetData().FirstOrDefault(x => x.Id == id);

            if (item == null)
                return NotFound();

            _repository.RemoveItem(item);

            return Ok();
        }
    }
}