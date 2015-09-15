using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
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

        [HttpPut]
        public IHttpActionResult PutData([FromBody] Thing model)
        {
            _repository.AddItem(model);

            return Ok();
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